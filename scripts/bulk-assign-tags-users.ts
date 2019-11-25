import { print } from "graphql";
import gql from "graphql-tag";
import { BUILT_PRISMA_ENDPOINT, COMPUTED_EMAIL_OR_USERNAME_SALT, GET_ALL_TAGS_QUERY } from "./constants";
import { csvParser } from "./helpers";
import axios from "axios";
import { hash } from "bcrypt";

export interface UsersToUpdate {
  email: string;
  tags?: any;
}

export class BulkAssignTagsToUsers {
  public static async updateUserWithTags(userToUpdate: UsersToUpdate): Promise<Boolean | any> {
    let axiosResponse;
    try {
      const updateUserWithtags = gql`
        mutation updateUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
          updateUser(data: $data, where: $where) {
            id
          }
        }
      `;
      axiosResponse = await axios.post(BUILT_PRISMA_ENDPOINT, {
        query: print(updateUserWithtags),
        variables: {
          data: {
            tags: userToUpdate.tags,
          },
          where: { _email: await BulkAssignTagsToUsers.hashEmailOrUsername(userToUpdate.email) },
        },
      });

      return axiosResponse.data.data;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
  public static async hashEmailOrUsername(emailOrUsername: String): Promise<String> {
    return await hash(emailOrUsername.toLowerCase(), COMPUTED_EMAIL_OR_USERNAME_SALT);
  }

  public static handleUpdateUserApiResponse(apiResponse: any, userToUpdate: any): boolean {
    if (
      (apiResponse && apiResponse.errors && apiResponse.errors[0].message.match(/no\snode\sfor\sthe\smodel\suser/i)) ||
      apiResponse.updateUser == null
    ) {
      console.log(`User with an email ${userToUpdate.email} doesnt exist`);
      return false;
    } else {
      console.log(
        `User with an email ${userToUpdate.email} had its tags updated successfully with ${JSON.stringify(
          userToUpdate.tags,
        )}`,
      );
      return true;
    }
  }

  public static async getAllExistingTagNames(): Promise<any[]> {
    let axiosResponse;
    try {
      axiosResponse = await axios.post(BUILT_PRISMA_ENDPOINT, {
        query: GET_ALL_TAGS_QUERY,
      });
    } catch (error) {
      console.error(error);
    }
    return axiosResponse.data.data.userTags.map((tag) => tag.name);
  }

  public static filterNonExistingTags(allExistingTags: string[], tagNames: string[] = []): string[] {
    let tagsToCreateList = [];
    if (tagNames != null) {
      const tagsToCreate = tagNames.filter((tagName) => !allExistingTags.includes(tagName));
      for (const futureTag of tagsToCreate) {
        // @ts-ignore // set two lines above
        tagsToCreateList.push(futureTag);
      }
    }
    return tagsToCreateList;
  }
  public static async createNonExistingTags(tagsToCreate: string[]) {
    let tagsCreated = 0;
    try {
      const createUserTagMutation = gql`
        mutation createUserTag($data: UserTagCreateInput!) {
          createUserTag(data: $data) {
            id
          }
        }
      `;
      for (const tag of tagsToCreate) {
        // console.log("axios");
        // console.log(axios);
        const axiosResponse = await axios.post(BUILT_PRISMA_ENDPOINT, {
          query: print(createUserTagMutation),
          variables: {
            data: {
              name: tag,
            },
          },
        });
        const apiResponse = axiosResponse.data.data;

        if (!!apiResponse && apiResponse && !apiResponse.errors) {
          tagsCreated++;
        }
      }
      console.log(`${tagsCreated} out of ${tagsToCreate.length} tags were created`);
    } catch (error) {
      console.error(error);
    }
  }

  public static createTagsQueryObj(allTags: string[] = []) {
    const tagObjects: any = {};
    if (allTags == null || allTags.length === 0) {
      return undefined;
    }

    return {
      connect: allTags.map((tag) => {
        return {
          name: tag,
        };
      }),
    };
  }

  public static async parseCsvToUpdateUserTags(
    rawParsedUsers: string[][],
    tagsToAdd: string[] = [],
  ): Promise<UsersToUpdate[]> {
    const allExistingTags = await BulkAssignTagsToUsers.getAllExistingTagNames();
    const tagsToCreate = BulkAssignTagsToUsers.filterNonExistingTags(allExistingTags, tagsToAdd);

    await BulkAssignTagsToUsers.createNonExistingTags(tagsToCreate);

    const tagsQuery = BulkAssignTagsToUsers.createTagsQueryObj(tagsToAdd);
    return rawParsedUsers.map(([username, password, email]) => ({
      email: email.toLowerCase().trim(),
      tags: tagsQuery,
    }));
  }

  public static async updateUsers(UsersToUpdate: UsersToUpdate[]) {
    let isSuccessful;
    let usersUpdated = 0;
    try {
      for (const user of await UsersToUpdate) {
        const apiResponse = await BulkAssignTagsToUsers.updateUserWithTags(user);
        if (!apiResponse) break;

        isSuccessful = BulkAssignTagsToUsers.handleUpdateUserApiResponse(apiResponse, user);
        if (isSuccessful) usersUpdated++;
      }

      console.log(`Out of ${UsersToUpdate.length} users, ${usersUpdated} users were successfuly updated.`);
    } catch (error) {
      console.error(error);
    }
  }
}
async function initMigrations() {
  const rawParsedUsers = csvParser("src/data/testing.csv");
  const testingTags = [
    "on_my_way_123131231122131",
    `random_string${
      Math.random()
        .toString()
        .split(".")[1]
    }`,
  ];
  const usersToUpdate = BulkAssignTagsToUsers.parseCsvToUpdateUserTags(rawParsedUsers, testingTags);

  BulkAssignTagsToUsers.updateUsers(await usersToUpdate);
}

import { BulkAssignTagsToUsers } from "../bulk-assign-tags-users";
import axios from "axios";
import { BUILT_PRISMA_ENDPOINT } from "../constants";
import gql from "graphql-tag";
import { print } from "graphql";

describe("bulkAssignUserTags", () => {
  it("should return a user with added tags", async () => {
    try {
      const email = `testingemail${
        Math.random()
          .toString()
          .split(".")[1]
      }@gmail.com`;
      const hashedEmail = await BulkAssignTagsToUsers.hashEmailOrUsername(email);

      const mutationCreateUserResults = gql`
        mutation createUser($data: UserCreateInput!) {
          createUser(data: $data) {
            _email
          }
        }
      `;

      await axios.post(BUILT_PRISMA_ENDPOINT, {
        query: print(mutationCreateUserResults),
        variables: {
          data: {
            _email: hashedEmail,
            password: "passwadsadasord",
            lastLoggedInAt: new Date(),
          },
        },
      });

      const tagsToCreate = [
        "on_my_way",
        `testingtag${
          Math.random()
            .toString()
            .split(".")[1]
        }`,
      ];
      const usersToUpdate = await BulkAssignTagsToUsers.parseCsvToUpdateUserTags(
        [[undefined, undefined, email]] as any,
        tagsToCreate,
      );
      await BulkAssignTagsToUsers.updateUsers(usersToUpdate);

      const getUserQuery = gql`
        query user($where: UserWhereUniqueInput!) {
          user(where: $where) {
            _email
            tags {
              name
            }
          }
        }
      `;

      const getUser = await axios.post(BUILT_PRISMA_ENDPOINT, {
        query: print(getUserQuery),
        variables: {
          where: {
            _email: hashedEmail,
          },
        },
      });
      let resTagObject = getUser.data.data.user.tags;
      expect(resTagObject).toEqual(expect.arrayContaining([{ name: tagsToCreate[0] }, { name: tagsToCreate[1] }]));
    } catch (error) {
      console.error(error);
      fail();
    }
  });
});

import { BulkAssignTagsToUsers } from "../bulk-assign-tags-users";
import axios from "axios";
import { BUILT_PRISMA_ENDPOINT, GET_ALL_TAGS_QUERY } from "../constants";
import gql from "graphql-tag";
import { print } from "graphql";

describe("bulkAssignUserTags", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const userToUpdate = {
    username: "testusername",
    password: "testpassword",
    email: "testemail@gmail.com",
    tags: { connect: [{ name: "existing_tag_four" }, { name: "non_existing_tag_one" }] },
  };

  const usersToUpdate = [
    userToUpdate,
    {
      username: "testusernameTwo",
      password: "testpasswordTwo",
      email: "testemailTwo@gmail.com",
      tags: { connect: [{ name: "existing_tag_four" }, { name: "non_existing_tag_one" }] },
    },
  ];

  const updateUserWithtags = gql`
    mutation updateUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
      updateUser(data: $data, where: $where) {
        id
      }
    }
  `;

  it("should return all existing users tags", async () => {
    const mockAxios = jest.spyOn(axios, "post").mockResolvedValueOnce({
      data: { data: { userTags: [{ name: "testing_existing_tag_one" }, { name: "testing_existing_tag_two" }] } },
    } as any);
    const allExistingTags = await BulkAssignTagsToUsers.getAllExistingTagNames();
    expect(mockAxios).toHaveBeenCalledWith(BUILT_PRISMA_ENDPOINT, {
      query: GET_ALL_TAGS_QUERY,
    });
    expect(allExistingTags).toEqual(expect.arrayContaining(["testing_existing_tag_one", "testing_existing_tag_two"]));
  });

  it("should update user to have tags", async () => {
    const axiosMock = jest.spyOn(axios, "post").mockImplementation(async () => ({ staus: 200, data: {} } as any));
    jest.spyOn(BulkAssignTagsToUsers, "hashEmailOrUsername").mockResolvedValue("hashedemail");

    await BulkAssignTagsToUsers.updateUserWithTags(userToUpdate);

    expect(axiosMock).toHaveBeenCalledWith(BUILT_PRISMA_ENDPOINT, {
      query: print(updateUserWithtags),
      variables: {
        data: {
          tags: userToUpdate.tags,
        },
        where: { _email: "hashedemail" },
      },
    });
  });

  it("should hash email or username", async () => {
    const hashedEmail = await BulkAssignTagsToUsers.hashEmailOrUsername(userToUpdate.email);
    expect(hashedEmail).toEqual(expect.any(String));
  });

  it("should log out if the user does not exist", async () => {
    const axiosMock = jest
      .spyOn(axios, "post")
      .mockResolvedValueOnce({ data: { data: { errors: [{ message: "No node for the model user" }] } } } as any);

    const consoleMock = jest.spyOn(console, "log");
    jest.spyOn(BulkAssignTagsToUsers, "hashEmailOrUsername").mockResolvedValueOnce("hashedemail");

    const nonExistingUser = {
      username: "testusername",
      password: "testpassword",
      email: "testemail@gmail.com",
      tags: { connect: [{ name: "existing_tag_four" }, { name: "non_existing_tag_one" }] },
    };

    await BulkAssignTagsToUsers.updateUsers([nonExistingUser]);

    expect(axiosMock).toHaveBeenCalledWith(BUILT_PRISMA_ENDPOINT, {
      query: print(updateUserWithtags),
      variables: {
        data: {
          tags: nonExistingUser.tags,
        },
        where: { _email: "hashedemail" },
      },
    });
    expect(consoleMock).toHaveBeenCalledWith(`User with an email testemail@gmail.com doesnt exist`);
  });

  it("should log out if the update was successful", async () => {
    jest.spyOn(axios, "post").mockResolvedValueOnce({ data: { data: { updateUser: { id: "testing_id" } } } } as any);

    const consoleMock = jest.spyOn(console, "log");

    await BulkAssignTagsToUsers.updateUsers([userToUpdate]);

    expect(consoleMock).toHaveBeenCalledWith(
      expect.stringContaining('{"connect":[{"name":"existing_tag_four"},{"name":"non_existing_tag_one"}]}'),
    );
  });

  it("should console out how many users were successfuly updated", async () => {
    const mockHandleUpdateUserApiResponse = jest
      .spyOn(BulkAssignTagsToUsers, "handleUpdateUserApiResponse")
      .mockImplementation(() => true)
      .mockImplementation(() => true);
    const consoleMock = jest.spyOn(console, "log");

    await BulkAssignTagsToUsers.updateUsers(usersToUpdate);

    expect(mockHandleUpdateUserApiResponse).toHaveBeenCalledTimes(2);
    expect(consoleMock).toHaveBeenCalledWith("Out of 2 users, 2 users were successfuly updated.");
  });

  it("should throw an error and return false when post request returns unhandeled promise", async () => {
    const mockAxios = jest.spyOn(axios, "post").mockRejectedValueOnce(() => Promise.reject());
    const mockConsoleError = jest.spyOn(console, "error");
    const updatedUser = await BulkAssignTagsToUsers.updateUserWithTags(userToUpdate);

    expect(mockConsoleError).toHaveBeenCalled();
    expect(updatedUser).toEqual(false);
  });
});
const existingTags = ["existing_tag_one", "existing_tag_four"];
const newlyCreatedTags = ["non_existing_tag_one", "non_existing_tag_two"];
const allUserTags: any = ["existing_tag_one", "existing_tag_two", "existing_tag_three", "existing_tag_four"];
describe("tag processing", () => {
  beforeEach(() => {
    const mockFn = jest.fn();
    jest.restoreAllMocks();
  });

  it("should query all existing tags", async () => {
    const mockAxios = jest.spyOn(axios, "post").mockResolvedValueOnce({
      data: {
        data: {
          userTags: [{ name: "existing_tag_one" }, { name: "existing_tag_four" }],
        },
      },
    } as any);

    const queryExistingTags = await BulkAssignTagsToUsers.getAllExistingTagNames();

    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(queryExistingTags).toEqual(expect.arrayContaining(existingTags));
  });

  it("should filer non existing tags from existing", () => {
    const nonExistingtags = BulkAssignTagsToUsers.filterNonExistingTags(allUserTags, [
      ...existingTags,
      ...newlyCreatedTags,
    ]);

    expect(nonExistingtags).toEqual(expect.arrayContaining(newlyCreatedTags));
  });

  it("should create non existing tags", async () => {
    const mockAxios = jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        data: {
          userTags: {
            id: "someID",
          },
        },
      },
    } as any);

    const mockConsole = jest.spyOn(console, "log");

    await BulkAssignTagsToUsers.createNonExistingTags(newlyCreatedTags);

    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(mockConsole).toHaveBeenCalledWith("2 out of 2 tags were created");
  });

  it("should return correctly formatted userTags connect query object", async () => {
    const tagsQuery = BulkAssignTagsToUsers.createTagsQueryObj([...existingTags, ...newlyCreatedTags]);

    expect(tagsQuery).toEqual({
      connect: [
        { name: "existing_tag_one" },
        { name: "existing_tag_four" },
        { name: "non_existing_tag_one" },
        { name: "non_existing_tag_two" },
      ],
    });
  });

  it("should return undefined if no userTags are passed", async () => {
    expect(BulkAssignTagsToUsers.createTagsQueryObj()).toEqual(undefined);
  });

  it("should transform raw user data into a user object with new tags", async () => {
    const mockRawParsedUsers = [["userOne", "password", "userEmail"]] as any[][];
    jest.spyOn(axios, "post");
    const formattedUsers = await BulkAssignTagsToUsers.parseCsvToUpdateUserTags(mockRawParsedUsers, [
      "testing_tag_one",
      "testing_tag_two",
    ]);
    expect(formattedUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "useremail",
          tags: expect.any(Object),
        }),
      ]),
    );
  });
});

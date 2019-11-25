describe("createNonConfirmedUser", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should create non confirmed user", async () => {
    const expectedResult = "some user";
    const mockDb: any = {
      createUser: jest.fn(() => Promise.resolve(expectedResult)),
      userTags: jest.fn(() => Promise.resolve([]))
    };
    const expectedLastLoggedInAt = new Date("2001-01-01");
    jest
      .spyOn(DateTimeService, "nowDateTime")
      .mockReturnValueOnce(expectedLastLoggedInAt);
    jest
      .spyOn(SecurityService, "hashUsername")
      .mockResolvedValueOnce("hashedUsername123");
    jest
      .spyOn(SecurityService, "hashEmail")
      .mockResolvedValueOnce("hashedEmail123");
    jest
      .spyOn(SecurityService, "hashPassword")
      .mockResolvedValueOnce("hashedPassword123");

    const result = await createNonConfirmedUser(mockDb, {
      username: "some_user",
      email: "abc@samlabs.com",
      password: "secret123"
    });

    expect(mockDb.createUser).toBeCalledWith({
      _username: "hashedUsername123",
      _email: "hashedEmail123",
      password: "hashedPassword123",
      consentSaveEmail: false,
      lastLoggedInAt: expectedLastLoggedInAt,
      packages: {
        connect: {
          slug: "non_confirmed"
        }
      }
    });
    expect(result).toBe(expectedResult);
  });

  it("should create tags when new tags are given", async () => {
    const mockDb: any = {
      createUser: jest.fn(() => Promise.resolve("some user")),
      userTags: jest.fn(() => Promise.resolve([]))
    };

    const result = await createNonConfirmedUser(mockDb, {
      username: "some_user",
      email: "test@samlabs.com",
      password: "secret123",
      tags: ["school1", "school2"]
    });

    expect(mockDb.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: { create: [{ name: "school1" }, { name: "school2" }] }
      })
    );
  });

  it("should use existing tags when tags already exists", async () => {
    const mockDb: any = {
      createUser: jest.fn(() => Promise.resolve("some user")),
      userTags: jest.fn(() =>
        Promise.resolve([
          { name: "school1", id: "1" },
          { name: "school2", id: "2" }
        ])
      )
    };
    const result = await createNonConfirmedUser(mockDb, {
      username: "some_user",
      email: "test@samlabs.com",
      password: "secret123",
      tags: ["school1", "school2"]
    });

    expect(mockDb.userTags).toHaveBeenCalledWith({
      where: { name_in: ["school1", "school2"] }
    });
    expect(mockDb.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: { connect: [{ name: "school1" }, { name: "school2" }] }
      })
    );
  });

  it("should attach correct tags only if tags are passed at user creation", async () => {
    const allTagsInDatabase = [
      { name: "school1", id: "1" },
      { name: "school2", id: "2" }
    ];
    const mockDb: any = {
      createUser: jest.fn(() => Promise.resolve("some user")),
      userTags: jest.fn(() => Promise.resolve(allTagsInDatabase))
    };

    await createNonConfirmedUser(mockDb, {
      username: "some_user",
      email: "test@samlabs.com",
      password: "secret123"
    });

    expect(mockDb.userTags).not.toHaveBeenCalled();
    expect(mockDb.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ tags: undefined })
    );
  });
});

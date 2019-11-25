export const createNonConfirmedUser = async (
  db: Prisma,
  data: SignupNonConfirmedUserInput
): Promise<User> => {
  const { email, password, username, legacyAuth, tags } = data;

  return db.createUser({
    email: "email",
    password: "password",
    consentSaveEmail: false,
    packages: { connect: { slug: "NON_CONFIRMED_PACKAGE" } },
    lastLoggedInAt: DateTimeService.nowDateTime(),

    tags: await transformToPrismaTags(db, tags)
    // NOTE: must not include profile nor settings - UpdateProfile and UpdateUserSettings tests depend on non confirmed user not to have settings and profile
  });
};

async function transformToPrismaTags(
  db: Prisma,
  tagNames: string[] | null | undefined
): Promise<Maybe<UserTagCreateManyInput>> {
  if (tagNames == null) {
    return undefined;
  }
  const existingTagsNames = (
    await db.userTags({ where: { name_in: tagNames } })
  ).map(tag => tag.name);
  const tagObjects: UserTagCreateManyInput = {};

  for (const existingTagName of existingTagsNames) {
    if (tagObjects.connect == null) {
      tagObjects.connect = [];
    }
    // @ts-ignore // set two lines above
    tagObjects.connect.push({ name: existingTagName });
  }

  if (tagNames != null) {
    for (const newTagName of tagNames.filter(
      tagName => !existingTagsNames.includes(tagName)
    )) {
      if (tagObjects.create == null) {
        tagObjects.create = [];
      }
      // @ts-ignore // set two lines above
      tagObjects.create.push({ name: newTagName });
    }
  }

  return tagObjects.create != null || tagObjects.connect != null
    ? tagObjects
    : undefined;
}

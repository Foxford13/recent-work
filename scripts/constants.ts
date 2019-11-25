import gql from "graphql-tag";
import { print } from "graphql";
export const LEGACY_API_ENDPOINT = "http://localhost:5430/api/v1";

export const API_ROOT_URL = "http://localhost:4000";

export const BUILT_PRISMA_ENDPOINT =
  process.env.BUILT_PRISMA_ENDPOINT ||
  "http://localhost:4466/sam-labs-api/development";

export const API_ROOT_PUBLIC_URL = "http://localhost:4000";

export const AXIOS_SIGNUP_CONFIG = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  }
};
export const GET_ALL_TAGS_QUERY = print(gql`
  query {
    userTags {
      name
      id
    }
  }
`);

import { API_ROOT_PUBLIC_URL } from "./constants";
import { csvParser, xlsParser } from "./helpers";
import axios from "axios";

import { print } from "graphql";
import gql from "graphql-tag";

export interface UserSignup {
  username: string;
  password: string;
  email: string;
  tags?: string[];
}

const signupNonConfirmedUserMutation = gql`
  mutation signupNonConfirmedUser($data: SignupNonConfirmedUserInput!) {
    signupNonConfirmedUser(data: $data) {
      token
    }
  }
`;

const registerUsers = async (usersToSignUp: UserSignup[]) => {
  // due to the fact that prisma doesnt deal with bulk-create/create many queries we decided to take for-loop approach
  for (const user of usersToSignUp) {
    try {
      const axiosResponse = await axios.post(`${API_ROOT_PUBLIC_URL}/graphql`, {
        query: print(signupNonConfirmedUserMutation),
        variables: {
          data: user
        }
      });

      const apiErrors = axiosResponse.data.errors;

      if (apiErrors) {
        if (apiErrors[0].message.match(/Username\sis\salready\sin\suse/i)) {
          console.error(
            `not imported, username already in use\t${user.username}\t${user.email}`
          );
        } else if (apiErrors[0].message.match(/Email\sis\salready\sin\suse/i)) {
          console.error(
            `not imported, email already in use\t${user.username}\t${user.email}`
          );
        }
      } else {
        console.log(`registered\t${user.username}\t${user.email}`);
      }
    } catch (error) {
      console.error(
        `Failed to signup ${JSON.stringify(user)}. Error: ${JSON.stringify(
          error.response.data
        )}`
      );
    }
  }
};

const parseUserSignups = (
  filenamePath: string,
  tags: string[] = []
): UserSignup[] => {
  const rawParsedUsers = xlsParser(filenamePath);

  return rawParsedUsers.map(([username, password, email]) => ({
    username: username.toLowerCase().trim(),
    password,
    email: email.toLowerCase().trim()
  }));
};

const parseCsvToUserSignups = (
  filenamePath: string,
  tags: string[] = []
): UserSignup[] => {
  const rawParsedUsers = csvParser(filenamePath);

  return rawParsedUsers.map(([username, password, email]) => ({
    username: username.toLowerCase().trim(),
    password,
    email: email.toLowerCase().trim(),
    tags: tags
  }));
};

// 2019-08-08 added users from here: https://docs.google.com/spreadsheets/d/1qllel_m3_V9lHloFjuwZOJKo5Sx-HFD5DWSTKdLbWhE
// 2019-08-20 added teachers from here (till 28th row): https://docs.google.com/spreadsheets/d/1vNSncjfrGwbAUuXTYUQt6NuPtirfGMxcuzs8vJ2wIG4?ts=5d5bf99d#gid=2048470422
// 2019-08-22 added teachers from here (29th row till end): https://docs.google.com/spreadsheets/d/1vNSncjfrGwbAUuXTYUQt6NuPtirfGMxcuzs8vJ2wIG4?ts=5d5bf99d#gid=2048470422
// 2019-08-29 added teachers from here: https://docs.google.com/spreadsheets/d/1FQJECEBnAZcz8DguFDbvjp9njT4tCa1ZE3jYrMaQC0Q
// 2019-09-26 added students from here: https://docs.google.com/spreadsheets/d/1Mb3fFqzBsgVcKMXL-Yz73As4sOHYjUXisbmzSO3czXQ
// 2019-10-03 added students from here: https://docs.google.com/spreadsheets/d/1ce0b6l2c6-AKobpZC85Eeare9p8B9zhYXLq2ySbdBVc

const usersToSignUp = parseCsvToUserSignups("src/data/testing.csv", [
  "school",
  "criteria"
]);

(async () => {
  await registerUsers(usersToSignUp);
})();

import { print } from "graphql";
import gql from "graphql-tag";
import { BUILT_PRISMA_ENDPOINT } from "./constants";
import axios from "axios";
import { storeAsJsonFile } from "./helpers";

const legacyQuery = gql`
  query legacyGraphs($skip: Int, $first: Int) {
    legacyGraphs(skip: $skip, first: $first) {
      id
      data
      name
      platformType
      platformVersion
      appVersion
      updatedAt
      createdAt
      user {
        _email
        _username
      }
    }
  }
`;

const flattenLegacyGraphs = (data) => {
  return data.map((el) => {
    return {
      id: el.id,
      data: el.data,
      name: el.name,
      platformType: el.platformType,
      platformVersion: el.platformVersion,
      appVersion: el.appVersion,
      updatedAt: el.updatedAt,
      createdAt: el.createdAt,
      _email: el.user._email,
      _username: el.user._username,
    };
  });
};

const requestLegacyGraphs = async (fileName: string) => {
  let skip = 0;
  let data = [] as any;

  try {
    for (let first = 5000; 0 < 1; first += 5000) {
      const axiosResponse = await axios.post(BUILT_PRISMA_ENDPOINT, {
        query: print(legacyQuery),
        variables: {
          skip: skip,
          first: first,
        },
      });
      skip += first;

      const dataChunk = flattenLegacyGraphs(axiosResponse.data.data.legacyGraphs);
      data.push(...dataChunk);
      if (axiosResponse.data.data.legacyGraphs.length < 1) break;
    }

    storeAsJsonFile(fileName, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
};
(async function() {
  await requestLegacyGraphs(`src/data/legacyGraphs.json`);
})();

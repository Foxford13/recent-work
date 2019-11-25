import * as fs from "fs";
import { dropLast } from "ramda";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7) +
  Math.random()
    .toString(36)
    .substring(7);

export const xlsParser = (filenamePath): string[][] => {
  const [columns, ...rows] = fs
    .readFileSync(filenamePath)
    .toString()
    .split("\n");

  return dropLast(1, rows).map((row) => row.replace(/\r/g, "").split("\t"));
};

export const csvParser = (filenamePath): string[][] => {
  return fs
    .readFileSync(filenamePath)
    .toString()
    .split("\n")
    .filter((row) => row !== "")
    .map((row) => row.split(","));
};

export const storeAsJsonFile = (fileName: string, data: any): void => {
  fs.writeFile(fileName, data, "utf-8", (err) => {
    if (err) throw err;
    console.log("The file has been created");
  });
};

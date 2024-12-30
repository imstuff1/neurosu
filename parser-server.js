/*Manual conversion for the purpose of the gamejam. To-do: auto convert client side when user uploads*/
const parser = require("osu-parser");
const fs = require("node:fs");
const path = require("node:path");

function convertOsuFilesToJSON(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(err);
          return;
        }

        if (stats.isDirectory()) {
          convertOsuFilesToJSON(filePath); // Recursively call the function for subdirectories
        } else if (file.endsWith(".osu")) {
          const jsonFilePath = filePath.replace(".osu", ".json");
          parser.parseFile(filePath, (err, beatmap) => {
            if (err) {
              console.error(err);
              return;
            }

            const beatmapString = JSON.stringify(beatmap);
            fs.writeFile(jsonFilePath, beatmapString, (err) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log(`Converted ${file} to JSON`);
            });
          });
        }
      });
    });
  });
}

const beatmapsDirectory = "./beatmaps";
convertOsuFilesToJSON(beatmapsDirectory);

const { cleanup, importCost, JAVASCRIPT, TYPESCRIPT} = require("import-cost"); 


const fs = require('fs');
const util = require('util');
const log_file = fs.createWriteStream('/home/hoax/importcost.log', {flags:'w'});
log_file.write('=====================================================================================\n')

console.log = function(d) { 
  log_file.write(util.format(d) + '\n');
};

process.stdin.setEncoding("utf8");

const receive = async () => {
  let result = "";

  for await (const chunk of process.stdin) result += chunk;

  return result;
};

// Pad data with '|' for combined chunks to be parsable
const give = (data) =>
  process.nextTick(() => process.stdout.write(`${JSON.stringify(data)}|`));

const filetypes = new Map([
  ["j", JAVASCRIPT],
  ["s", JAVASCRIPT],
  ["t", TYPESCRIPT],
  ["v", JAVASCRIPT],
]);

const init = async () => {
  console.log("init import-cost");
  const [path, filetype] = process.argv.slice(2);
  const lang = filetypes.get(filetype[0]);
  const contents = await receive();
  
  console.log("calling importcost with " + path + contents + lang);

  const emitter = importCost(path, contents, lang);

  emitter.on("error", (error) => {
    console.log("error " + error);
    give({ type: "error", error });

    cleanup();
  });

  emitter.on("calculated", ({ line, string, size, gzip }) => {
    console.log("calculated " + line + string + size + gzip);
    give({
      type: "calculated",
      data: { line, string, size, gzip },
    });
  });

  // Send done to ensure job stdin stays open
  emitter.on("done", (_) => {
    console.log("done")
    
    give({
      type: "done",
    });

    cleanup();
  });
};

try {
  init();
} catch {}

#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import { log, error, success } from "@daldalso/logger";
import { select, input } from "@inquirer/prompts";

const cwd = process.cwd();
const clientI18nInitializerExample = readFileSync(resolve(import.meta.dirname, "../res/client-i18n-initializer.example.ts")).toString();
const i18nInitializerExample = readFileSync(resolve(import.meta.dirname, "../res/i18n-initializer.example.tsx")).toString();
const i18nModuleLoaderExample = readFileSync(resolve(import.meta.dirname, "../res/i18n-module-loader.example.ts")).toString();
const i18nConfigExample = readFileSync(resolve(import.meta.dirname, "../res/i18n.config.example.cjs")).toString();
const lexiconExample = readFileSync(resolve(import.meta.dirname, "../res/lexicon.example.ts")).toString();
const lexiconistaExample = readFileSync(resolve(import.meta.dirname, "../res/lexiconista.example.ts")).toString();

async function main():Promise<void>{
  const command = process.argv[2] || await select({
    message: "Which command would you want to run?",
    choices: [
      { name: "Initialize i18n", value: "init" },
      { name: "Add new Lexicon", value: "add" }
    ]
  });
  switch(command){
    case "init":
      init(process.argv[3]);
      break;
    case "add":
      add(process.argv[3]);
      break;
    default:
      error(`Unknown command: ${command}`);
      log("Running without any commands lets you choose available commands.");
      process.exit(1);
  }
}
async function init(chunk:string):Promise<void>{
  const hasSource = resolve(cwd, "src");
  const path = existsSync(hasSource) ? resolve(cwd, "src/i18n") : resolve(cwd, "i18n");

  if(existsSync(path)){
    if(readdirSync(path).length){
      error(`The directory '${path}' must be empty.`);
      process.exit(1);
    }
  }else{
    mkdirSync(path);
  }
  chunk ||= await input({ message: "Locales? (comma separated)", default: "en" });
  const locales = toArray(chunk);
  writeFileSync(resolve(cwd, "i18n.config.cjs"), i18nConfigExample.replace(/LOCALES/g, JSON.stringify(locales)));
  mkdirSync(resolve(path, "lib"));
  writeFileSync(resolve(path, "lib/client-i18n-initializer.ts"), clientI18nInitializerExample);
  writeFileSync(resolve(path, "lib/i18n-initializer.tsx"), i18nInitializerExample);
  writeFileSync(resolve(path, "lib/i18n-module-loader.ts"), i18nModuleLoaderExample.replace(/CONFIG_IMPORT_SOURCE/g, hasSource ? "../../../i18n.config.cjs" : "../../i18n.config.cjs"));
  success(`Initialization finished to: ${path}`);
  add("l.example");
}
async function add(prefix:string):Promise<void>{
  const { locales } = await readConfig();
  const path = existsSync(resolve(cwd, "src")) ? resolve(cwd, "src/i18n") : resolve(cwd, "i18n");
  const defaultLocale = locales[0];

  if(!existsSync(path)){
    error(`The directory '${path}' not found.`);
    process.exit(1);
  }
  prefix ||= await input({ message: "Prefix?", default: "l.example" });
  const loaderPath = resolve(path, `${prefix}.ts`);

  if(existsSync(loaderPath)){
    error(`The file '${loaderPath}' already exists!`);
    process.exit(1);
  }
  writeFileSync(resolve(path, `${prefix}.ts`), lexiconistaExample
    .replace(/CAPITALIZED_LOCALE/g, defaultLocale[0].toUpperCase() + defaultLocale.slice(1))
    .replace(/LOCALE/g, defaultLocale)
    .replace(/PREFIX/g, prefix)
  );
  for(const v of locales){
    const lexiconPath = resolve(path, v, `${prefix}.${v}.ts`);
    if(existsSync(lexiconPath)){
      error(`The file '${lexiconPath}' already exists!`);
      process.exit(1);
    }
    if(!existsSync(resolve(path, v))){
      mkdirSync(resolve(path, v));
    }
    writeFileSync(resolve(path, v, lexiconPath), lexiconExample);
  }
  success(`Added: ${prefix}.ts`);
}
main();

function readConfig():Promise<{ 'locales': string[] }>{
  const configPath = readdirSync(cwd).find(v => /^i18n\.config\.c?js$/.test(v));
  if(!configPath){
    error("Configuration file not found.");
    process.exit(1);
  }
  return import(`file://${resolve(cwd, configPath)}`).then(res => res['default']);
}
function toArray(string:string):string[]{
  return string.split(',').map(v => v.trim());
}
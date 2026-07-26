#!/usr/bin/env node

/**
 * Universal File Toolkit — CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { pdfService, imageService, dataService, getTools } from '@uft/shared';

const program = new Command();

program
  .name('uft')
  .description('Universal File Toolkit — CLI file processing utility')
  .version('1.0.0');

// ── List Tools ──────────────────────────────────────────────
program
  .command('list')
  .description('List all available file processing tools')
  .action(() => {
    const tools = getTools();
    console.log(chalk.bold.magenta(`\nUniversal File Toolkit — Available Tools (${tools.length}):\n`));
    tools.forEach((t) => {
      console.log(`  ${chalk.cyan(t.id.padEnd(22))} ${chalk.bold(t.name.padEnd(20))} ${chalk.dim(t.description)}`);
    });
    console.log('\n');
  });

// ── PDF Commands ─────────────────────────────────────────────
const pdf = program.command('pdf').description('PDF manipulation operations');

pdf
  .command('merge')
  .description('Merge multiple PDF files')
  .argument('<files...>', 'PDF files to merge')
  .option('-o, --output <path>', 'Output file path', 'merged.pdf')
  .action(async (files: string[], options: { output: string }) => {
    const spinner = ora('Merging PDFs...').start();
    try {
      const loaded = await Promise.all(files.map(async (f) => ({
        data: await readFile(resolve(f)),
        name: basename(f),
      })));
      const res = await pdfService.mergePdf(loaded, { outputFilename: options.output });
      await writeFile(resolve(options.output), res.outputFiles[0].data);
      spinner.succeed(chalk.green(`Successfully merged ${files.length} PDFs -> ${options.output}`));
    } catch (err: any) {
      spinner.fail(chalk.red(`Error: ${err.message}`));
    }
  });

pdf
  .command('split')
  .description('Split a PDF by page ranges')
  .argument('<file>', 'PDF file to split')
  .option('-r, --ranges <ranges>', 'Page ranges e.g. "1-5,10-15"')
  .action(async (file: string, options: { ranges?: string }) => {
    const spinner = ora('Splitting PDF...').start();
    try {
      const data = await readFile(resolve(file));
      const res = await pdfService.splitPdf(data, basename(file), { ranges: options.ranges });
      for (const f of res.outputFiles) {
        await writeFile(resolve(f.name), f.data);
      }
      spinner.succeed(chalk.green(`Split into ${res.outputFiles.length} files`));
    } catch (err: any) {
      spinner.fail(chalk.red(`Error: ${err.message}`));
    }
  });

// ── Image Commands ───────────────────────────────────────────
const img = program.command('image').description('Image manipulation operations');

img
  .command('resize')
  .description('Resize an image')
  .argument('<file>', 'Image file to resize')
  .option('-w, --width <width>', 'Target width')
  .option('-h, --height <height>', 'Target height')
  .option('-o, --output <path>', 'Output file path')
  .action(async (file: string, options: { width?: string; height?: string; output?: string }) => {
    const spinner = ora('Resizing image...').start();
    try {
      const data = await readFile(resolve(file));
      const res = await imageService.resizeImage(data, basename(file), {
        width: options.width ? parseInt(options.width) : undefined,
        height: options.height ? parseInt(options.height) : undefined,
      });
      const outPath = options.output || `resized_${basename(file)}`;
      await writeFile(resolve(outPath), res.outputFiles[0].data);
      spinner.succeed(chalk.green(`Resized image -> ${outPath}`));
    } catch (err: any) {
      spinner.fail(chalk.red(`Error: ${err.message}`));
    }
  });

// ── Data Commands ────────────────────────────────────────────
const dataCmd = program.command('data').description('Data conversion operations');

dataCmd
  .command('json-to-csv')
  .description('Convert JSON to CSV')
  .argument('<file>', 'JSON file to convert')
  .option('-o, --output <path>', 'Output CSV file path')
  .action(async (file: string, options: { output?: string }) => {
    const spinner = ora('Converting JSON to CSV...').start();
    try {
      const content = await readFile(resolve(file));
      const res = await dataService.jsonToCsv(content, basename(file));
      const outPath = options.output || `${basename(file, '.json')}.csv`;
      await writeFile(resolve(outPath), res.outputFiles[0].data);
      spinner.succeed(chalk.green(`Converted -> ${outPath}`));
    } catch (err: any) {
      spinner.fail(chalk.red(`Error: ${err.message}`));
    }
  });

program.parse();

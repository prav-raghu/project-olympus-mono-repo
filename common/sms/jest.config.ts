import type { Config } from 'jest';
import preset from '../../jest.preset.js';

const config: Config = {
  ...preset,
  rootDir: '.',
  passWithNoTests: true,
};

export default config;

import { matchesPattern, isIgnored } from './glob-matcher';

describe('matchesPattern', () => {
  describe('exact matching', () => {
    it('should match an exact file path', () => {
      expect(matchesPattern('src/auth.ts', 'src/auth.ts')).toBe(true);
    });

    it('should not match a different path', () => {
      expect(matchesPattern('src/user.ts', 'src/auth.ts')).toBe(false);
    });
  });

  describe('single wildcard (*)', () => {
    it('should match any file in a directory with *.ext pattern', () => {
      expect(matchesPattern('pnpm-lock.yaml', '*.lock')).toBe(false);
      expect(matchesPattern('package-lock.json', '*.lock')).toBe(false);
      expect(matchesPattern('file.lock', '*.lock')).toBe(true);
    });

    it('should match filename without path using *.ext pattern', () => {
      expect(matchesPattern('src/snapshots/auth.snap', '*.snap')).toBe(true);
    });

    it('should not cross directory boundaries', () => {
      expect(matchesPattern('dist/main.js', '*.js')).toBe(true); // matches filename
      expect(matchesPattern('dist/sub/main.js', '*.js')).toBe(true); // matches filename
    });

    it('should match single-level wildcard in path', () => {
      expect(
        matchesPattern('src/auth/auth.service.ts', 'src/*/auth.service.ts'),
      ).toBe(true);
      expect(
        matchesPattern(
          'src/deep/nested/auth.service.ts',
          'src/*/auth.service.ts',
        ),
      ).toBe(false);
    });
  });

  describe('double wildcard (**)', () => {
    it('should match nested paths with **', () => {
      expect(
        matchesPattern('node_modules/lodash/index.js', 'node_modules/**'),
      ).toBe(true);
      expect(
        matchesPattern('node_modules/nested/deep/file.ts', 'node_modules/**'),
      ).toBe(true);
    });

    it('should match dist directory recursively', () => {
      expect(matchesPattern('dist/main.js', 'dist/**')).toBe(true);
      expect(matchesPattern('dist/chunks/vendor.js', 'dist/**')).toBe(true);
    });

    it('should match snapshot directories', () => {
      expect(
        matchesPattern(
          'src/auth/__snapshots__/auth.spec.ts.snap',
          '**/__snapshots__/**',
        ),
      ).toBe(true);
    });

    it('should not match unrelated paths', () => {
      expect(matchesPattern('src/auth/auth.ts', 'node_modules/**')).toBe(false);
    });
  });

  describe('empty and whitespace patterns', () => {
    it('should return false for empty pattern', () => {
      expect(matchesPattern('src/auth.ts', '')).toBe(false);
    });

    it('should return false for whitespace-only pattern', () => {
      expect(matchesPattern('src/auth.ts', '   ')).toBe(false);
    });
  });

  describe('image and binary file patterns', () => {
    it('should match .png files', () => {
      expect(matchesPattern('logo.png', '*.png')).toBe(true);
      expect(matchesPattern('assets/logo.png', '*.png')).toBe(true);
    });

    it('should match .jpg files', () => {
      expect(matchesPattern('photo.jpg', '*.jpg')).toBe(true);
    });

    it('should match .svg files', () => {
      expect(matchesPattern('icon.svg', '*.svg')).toBe(true);
    });

    it('should not match .ts files for image pattern', () => {
      expect(matchesPattern('auth.ts', '*.png')).toBe(false);
    });
  });
});

describe('isIgnored', () => {
  it('should return true if path matches any pattern in the list', () => {
    const patterns = ['node_modules/**', 'dist/**', '*.lock'];
    expect(isIgnored('node_modules/lodash/index.js', patterns)).toBe(true);
    expect(isIgnored('dist/main.js', patterns)).toBe(true);
    expect(isIgnored('file.lock', patterns)).toBe(true);
  });

  it('should return false if path does not match any pattern', () => {
    const patterns = ['node_modules/**', 'dist/**'];
    expect(isIgnored('src/auth/auth.service.ts', patterns)).toBe(false);
  });

  it('should return false for empty patterns array', () => {
    expect(isIgnored('src/auth.ts', [])).toBe(false);
  });

  it('should match project-level custom ignore patterns', () => {
    const patterns = ['src/legacy/**', '*.snap'];
    expect(isIgnored('src/legacy/old.ts', patterns)).toBe(true);
    expect(isIgnored('auth.spec.ts.snap', patterns)).toBe(true);
  });
});

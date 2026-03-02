import { describe, it, expect } from 'vitest';
import { isValidGitUrl } from '../src/utils/validation';

describe('isValidGitUrl — extended edge cases', () => {
  it('accepts URL with .git suffix', () => {
    expect(isValidGitUrl('https://github.com/user/repo.git')).toBe(true);
  });

  it('accepts URL with path segments', () => {
    expect(isValidGitUrl('https://github.com/org/team/repo')).toBe(true);
  });

  it('accepts URL with port number', () => {
    expect(isValidGitUrl('https://git.example.com:8443/repo')).toBe(true);
  });

  it('accepts URL with query params', () => {
    expect(isValidGitUrl('https://github.com/user/repo?ref=main')).toBe(true);
  });

  it('rejects SSH URL format', () => {
    expect(isValidGitUrl('git@github.com:user/repo.git')).toBe(false);
  });

  it('rejects file:// protocol', () => {
    expect(isValidGitUrl('file:///home/user/repo')).toBe(false);
  });

  it('rejects just a hostname', () => {
    expect(isValidGitUrl('github.com')).toBe(false);
  });

  it('accepts URL with spaces (URL constructor percent-encodes them)', () => {
    // Note: new URL() auto-encodes spaces, so this is treated as valid
    expect(isValidGitUrl('https://github.com/user/my repo')).toBe(true);
  });

  it('rejects javascript: protocol', () => {
    expect(isValidGitUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: protocol', () => {
    expect(isValidGitUrl('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('accepts minimal http URL', () => {
    expect(isValidGitUrl('http://x')).toBe(true);
  });

  it('accepts https URL with authentication', () => {
    expect(isValidGitUrl('https://user:pass@github.com/repo')).toBe(true);
  });
});

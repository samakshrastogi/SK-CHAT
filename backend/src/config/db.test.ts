import { describe, expect, it } from 'vitest';
import { buildMongoUri } from './db.js';

describe('buildMongoUri', () => {
  it('inserts the configured database into a multi-host MongoDB URL and preserves options', () => {
    const input = 'mongodb://user:password@host-a:27017,host-b:27017/?ssl=true&replicaSet=atlas&authSource=admin';
    expect(buildMongoUri(input, 'sk_connect')).toBe(
      'mongodb://user:password@host-a:27017,host-b:27017/sk_connect?ssl=true&replicaSet=atlas&authSource=admin'
    );
  });

  it('replaces an existing database path', () => {
    expect(buildMongoUri('mongodb+srv://user:password@cluster.example/old?retryWrites=true', 'new_db')).toBe(
      'mongodb+srv://user:password@cluster.example/new_db?retryWrites=true'
    );
  });
});
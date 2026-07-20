import { DomainValidationError } from './errors.js';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export function createMember(input: Member): Readonly<Member> {
  if (!input.id.trim() || !input.name.trim() || !input.color.trim()) {
    throw new DomainValidationError('Member id, name, and color are required.');
  }

  return Object.freeze({ ...input });
}

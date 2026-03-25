import { BackendCodesEnumError } from '~/backend-runner/_interfaces/backend-codes.enum';
import { CatchAllExecutor } from '~/backend-runner/_executors/catch-all.executor';

describe('CatchAllExecutor helpers', () => {
  const executor = new CatchAllExecutor({} as any);

  describe('extractLastJsonImproved', () => {
    it('retourne une erreur "No output" si stdout est vide', () => {
      const res = (executor as any).extractLastJsonImproved('');
      expect(res).toEqual({
        status: BackendCodesEnumError.INVALID_JSON_RESPONSE,
        message: 'No output',
      });
    });

    it('retourne une erreur "No JSON output" s il n y a aucun JSON valide', () => {
      const res = (executor as any).extractLastJsonImproved('hello world');
      expect(res).toEqual({
        status: BackendCodesEnumError.INVALID_JSON_RESPONSE,
        message: 'No JSON output',
      });
    });

    it('retourne le dernier JSON extrait de stdout', () => {
      const res = (executor as any).extractLastJsonImproved('prefix {"a":1} middle {"b":2}');
      expect(res).toEqual({ b: 2 });
    });

    it('ignore les accolades dans les strings', () => {
      const res = (executor as any).extractLastJsonImproved('{"a":"{not json}", "b":1}');
      expect(res).toEqual({ a: '{not json}', b: 1 });
    });
  });

  describe('validationRecursive', () => {
    it('produit un mapping des contraintes recursif (en profondeur 1)', () => {
      const error = {
        property: 'root',
        constraints: { isDefined: 'Root required' },
        children: [
          {
            property: 'child',
            constraints: { isString: 'Child must be a string' },
            children: [],
          },
        ],
      } as any;

      const validations = (executor as any).validationRecursive(error);
      expect(validations).toEqual({
        root: 'Root required',
        'root.child': 'Child must be a string',
      });
    });

    it('produit un mapping des contraintes recursif (en profondeur 2)', () => {
      const error = {
        property: 'root',
        constraints: { isDefined: 'Root required' },
        children: [
          {
            property: 'child',
            constraints: { isString: 'Child must be a string' },
            children: [
              {
                property: 'grand',
                constraints: { isNumber: 'Grand must be a number' },
                children: [],
              },
            ],
          },
        ],
      } as any;

      const validations = (executor as any).validationRecursive(error);
      expect(validations).toEqual({
        root: 'Root required',
        'root.child': 'Child must be a string',
        'root.child.child': 'Child must be a string',
        'root.child.child.grand': 'Grand must be a number',
      });
    });
  });
});


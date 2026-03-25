import { ValidationError } from 'class-validator';
import { IsActionConstraintValidator } from '~/backend-runner/_validators/is-action-constraint.validator';
import { BackendConfigActionDto } from '~/backend-runner/_dto/backend-config-v1.dto';
import { ActionType } from '~/backend-runner/_enum/action-type.enum';
import { OnErrorType } from '~/backend-runner/_enum/on-error-type.enum';

describe('IsActionConstraintValidator', () => {
  const validator = new IsActionConstraintValidator();

  it("retourne true pour une structure d'actions valide", async () => {
    const dto = new BackendConfigActionDto();
    dto.script = 'echo hello';
    dto.onError = OnErrorType.STOP;

    await expect(
      validator.validate({
        [ActionType.LIST_BACKENDS]: dto,
      } as any),
    ).resolves.toBe(true);
  });

  it("retourne false si une cle n'est pas une ActionType valide", async () => {
    const dto = new BackendConfigActionDto();
    dto.script = 'echo hello';

    await expect(
      validator.validate({
        NOT_A_REAL_ACTION: dto,
      } as any),
    ).resolves.toBe(false);
  });

  it('rejette si le DTO BackendConfigActionDto est invalide', async () => {
    const dto = new BackendConfigActionDto();
    // Script invalide => @IsString() + @IsNotEmpty()
    dto.script = '';

    await expect(
      validator.validate({
        [ActionType.LIST_BACKENDS]: dto,
      } as any),
    ).rejects.toEqual(expect.any(Array<ValidationError>));
  });
});


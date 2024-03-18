import { Transform, plainToInstance } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, Validate } from 'class-validator';
import { IsActionConstraintValidator } from '../_validators/is-action-constraint.validator';
import { ActionType } from '../_enum/action-type.enum';
import { OnErrorType } from '../_enum/on-error-type.enum';

export class BackendConfigActionDto {
  @IsString()
  @IsNotEmpty()
  public script: string;

  @IsEnum(OnErrorType)
  public onError: string = OnErrorType.CONTINUE;
}

export class BackendConfigV1Dto {
  @IsString()
  @IsNotEmpty()
  public name: string;

  @IsString()
  public description?: string;

  @IsString()
  @IsNotEmpty()
  public path: string;

  @IsBoolean()
  @IsNotEmpty()
  public active: boolean;

  @Validate(IsActionConstraintValidator, {
    each: true,
    message: "Une ou plusieurs clés dans 'actions' ne correspondent pas aux valeurs ActionType valides.",
  })
  @Transform(({ value }) => {
    return Object.entries(value).reduce((acc, [key, val]) => {
      if (Object.values(ActionType).includes(key as ActionType)) {
        acc[key] = plainToInstance(BackendConfigActionDto, val);
      }
      return acc;
    }, {});
  })
  public actions: Record<ActionType, BackendConfigActionDto>;
}

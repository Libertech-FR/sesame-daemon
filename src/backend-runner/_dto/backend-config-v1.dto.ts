import { Transform, plainToInstance } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, Validate } from 'class-validator';
import { IsActionConstraintValidator } from '../_validators/is-action-constraint.validator';

export enum ActionType {
  LIST_BACKENDS = 'LIST_BACKENDS',
  PING_TARGET = 'PING_TARGET',
  IDENTITY_CREATE = 'IDENTITY_CREATE',
  IDENTITY_UPDATE = 'IDENTITY_UPDATE',
  IDENTITY_DELETE = 'IDENTITY_DELETE',
  IDENTITY_PASSWORD_RESET = 'IDENTITY_PASSWORD_RESET',
  IDENTITY_PASSWORD_CHANGE = 'IDENTITY_PASSWORD_CHANGE',
}

export enum OnErrorType {
  CONTINUE = 'continue',
  STOP = 'stop',
}

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

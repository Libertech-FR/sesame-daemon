import { IsString, IsEnum, IsBoolean, IsNotEmpty } from 'class-validator';

export enum ActionType {
  LIST_BACKENDS = 'LIST_BACKENDS',
  IDENTITY_CREATE = 'IDENTITY_CREATE',
  IDENTITY_UPDATE = 'IDENTITY_UPDATE',
  IDENTITY_DELETE = 'IDENTITY_DELETE',
  IDENTITY_PASSWORD_RESET = 'IDENTITY_PASSWORD_RESET',
  IDENTITY_PASSWORD_CHANGE = 'IDENTITY_PASSWORD_CHANGE',
}

export class BackendActionDto {
  @IsString()
  @IsNotEmpty()
  public script: string;

  @IsString()
  @IsEnum(['continue', 'stop'])
  public onError: string;
}

export class BackendConfigDto {
  @IsString()
  @IsNotEmpty()
  public name: string;

  @IsString()
  public description?: string;

  /**
   * Path to the backend script
   * If not set, it will be the directory of the config file
   */
  @IsString()
  @IsNotEmpty()
  public path: string;

  @IsBoolean()
  @IsNotEmpty()
  public active: boolean;

  public actions: Record<ActionType, BackendActionDto>;
}

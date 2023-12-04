import { IsString, IsEnum, IsNumber, IsNotEmpty } from 'class-validator';

export enum ActionType {
  // noinspection JSUnusedGlobalSymbols
  LISTBACKEND = 'LISTBACKEND',
  CHANGEPWD = 'CHANGEPWD',
  RESETPWD = 'RESETPWD',
  ADDIDENT = 'ADDIDENT',
  UPDATEIDENT = 'UPDATEIDENT',
  DELIDENT = 'DELIDENT',
}

export class BackendActionDto {
  @IsString()
  public exec: string;

  @IsString()
  @IsEnum(['pass', 'failed'])
  public onError: string;
}

export class BackendConfigDto {
  @IsString()
  @IsNotEmpty()
  public name: string;

  @IsString()
  public description: string;

  @IsString()
  public path: string;

  @IsNumber()
  @IsNotEmpty()
  @IsEnum([0, 1])
  public active: number;

  public actions: Record<ActionType, BackendActionDto>;
}

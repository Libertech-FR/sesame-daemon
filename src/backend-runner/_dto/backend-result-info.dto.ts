import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { BackendCodesEnum } from '../_interfaces/backend-codes.enum';

export class BackendResultInfoDto {
  @IsEnum(BackendCodesEnum)
  public status: number;

  @IsString()
  @IsOptional()
  public message?: string;

  @IsObject()
  @IsOptional()
  public data?: object;
}

import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { BackendCodesEnumError, BackendCodesEnumSuccess } from '../_interfaces/backend-codes.enum';

export class BackendResultInfoDto {
  @IsString()
  @IsOptional()
  public message?: string;

  @IsObject()
  @IsOptional()
  public data?: object;
}

export class BackendResultInfoSuccessDto extends BackendResultInfoDto {
  @IsEnum(BackendCodesEnumSuccess)
  public status: number;
}

export class BackendResultInfoErrorDto extends BackendResultInfoDto {
  @IsEnum(BackendCodesEnumError)
  public status: number;
}

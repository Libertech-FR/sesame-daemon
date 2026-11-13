import { IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { BackendCodesEnumSuccess } from '../_interfaces/backend-codes.enum';

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
  // Tout code > 0 est une erreur (codes BackendCodesEnumError, combinaisons de flags ou codes spécifiques au backend)
  @IsInt()
  @Min(1)
  public status: number;
}

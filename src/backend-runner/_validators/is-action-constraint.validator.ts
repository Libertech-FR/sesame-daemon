import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  validateOrReject,
} from 'class-validator';
import { BackendConfigActionDto } from '../_dto/backend-config-v1.dto';
import { ActionType } from '../_enum/action-type.enum';

@ValidatorConstraint({ async: true })
export class IsActionConstraintValidator implements ValidatorConstraintInterface {
  public async validate(propertyValue: { [key: string]: BackendConfigActionDto }): Promise<boolean> {
    for (const key in propertyValue) {
      if (!Object.values(ActionType).includes(key as ActionType)) {
        return false;
      }
      await validateOrReject(propertyValue[key]);
    }
    return true;
  }

  public defaultMessage(args: ValidationArguments) {
    return `"${args.value}" is not a valid ActionType`;
  }
}

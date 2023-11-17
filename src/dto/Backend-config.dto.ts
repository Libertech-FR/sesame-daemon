import { IsInt, IsString, IsEnum, IsNumber,IsNotEmpty } from 'class-validator';
export enum ActionType {
    CHANGEPWD = 'CHANGEPWD',
    ADDIDENT = 'ADDIDENT',
    UPDATEIDENT ='UPDATEIDENT',
    DELIDENT = 'DELIDENT'
}
export class BackendActionDto{
    exec: string
    @IsString()
    @IsEnum(['pass', 'failed'])
    onError: string
}

export class BackendConfigDto {
    @IsString()
    @IsNotEmpty()
    name: string
    @IsString()
    description: string
    @IsString()
    path: string
    @IsNumber()
    @IsNotEmpty()
    @IsEnum([0,1])
    active: number
    actions: Record<ActionType, BackendActionDto>

}
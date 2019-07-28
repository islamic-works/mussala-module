export interface GPSConfig{
    desiredAccuracy?: number;
    updateDistance?: number; 
    minimumUpdateTime? : number // tempo de atualização mínimo em milessegundos
   }
import { Injectable } from '@nestjs/common';

export interface ServiceInfo {
  name: string;
  status: 'ok';
}

@Injectable()
export class AppService {
  getInfo(): ServiceInfo {
    return { name: 'vehicle-utilization-api', status: 'ok' };
  }
}

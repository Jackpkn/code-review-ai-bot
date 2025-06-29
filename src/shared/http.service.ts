import { Injectable } from '@nestjs/common';
import { HttpService as NestHttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
@Injectable()
export class HttpService {
  constructor(private readonly httpService: NestHttpService) {}
  get<T = any>(url: string, config?: any): Observable<AxiosResponse<T>> {
    return this.httpService.get(url, config);
  }
  post<T = any>(
    url: string,
    data?: any,
    config?: any,
  ): Observable<AxiosResponse<T>> {
    return this.httpService.post(url, data, config);
  }
  put<T = any>(
    url: string,
    data?: any,
    config?: any,
  ): Observable<AxiosResponse<T>> {
    return this.httpService.put(url, data, config);
  }
  delete<T = any>(url: string, config?: any): Observable<AxiosResponse<T>> {
    return this.httpService.delete(url, config);
  }
}

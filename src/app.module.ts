import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { MappingModule } from './mapping/mapping.module';
import {tenantDatabaseConfig, globalCoreDatabaseConfig, marketplaceDumpDatabaseConfig} from './orm.config';


@Module({
  imports: [CategoryModule, MappingModule,
    TypeOrmModule.forRoot({...tenantDatabaseConfig, name:'tenant'}),
    TypeOrmModule.forRoot({...globalCoreDatabaseConfig, name:'core'}),
    TypeOrmModule.forRoot({...marketplaceDumpDatabaseConfig, name:'marketplace'}),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

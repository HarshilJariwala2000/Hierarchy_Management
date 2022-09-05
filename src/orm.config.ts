import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { CoreCategory,  } from './entities/core.category.entity';
import { MarketplaceCategory, Marketplaces } from './entities/marketplace.category.entity';
import { TenantCategory,  SubscribedMarketplaces, TenantHierarchyLevel, TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping } from './entities/tenant.category.entity'
import * as dotenv from 'dotenv'
dotenv.config()

export const tenantDatabaseConfig: TypeOrmModuleOptions = {
    type:  "postgres",
    username: process.env.USERNAME1,
    password: process.env.PASSWORD1,
    port: parseInt(process.env.PORT1),
    host: process.env.HOST1,
    database: process.env.DB1,
    synchronize: true,
    entities:[ TenantCategory, SubscribedMarketplaces, TenantHierarchyLevel, TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping],
}

export const globalCoreDatabaseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    username: process.env.USERNAME2,
    password: process.env.PASSWORD2,
    port: parseInt(process.env.PORT2),
    host: process.env.HOST2,
    database: process.env.DB2,
    synchronize: true,
    entities:[CoreCategory,],

}

export const marketplaceDumpDatabaseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    username: process.env.USERNAME3,
    password: process.env.PASSWORD3,
    port: parseInt(process.env.PORT3),
    host: process.env.HOST3,
    database: process.env.DB3,
    synchronize: true,
    entities: [MarketplaceCategory, Marketplaces],
}
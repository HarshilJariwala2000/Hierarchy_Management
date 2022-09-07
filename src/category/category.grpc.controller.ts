import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CategoryModifyService } from './category.modify.service';
import { CategoryMapService } from './category.map.service';
const t1 = 1;
const t2 = 2;
const t3 = 3;
const t4=4
@Controller('category')
export class CategoryGrpcController{
    constructor(private readonly categoryService: CategoryModifyService,
        private readonly categoryMapService:CategoryMapService) {}

        
}
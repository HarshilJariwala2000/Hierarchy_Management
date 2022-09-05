import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as path from 'path';

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  // await app.listen(3000);
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:50051',
      package: 'category',
      protoPath: path.resolve(__dirname, '../../proto/category.proto'),
      loader:{keepCase:true}
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);

  // const app = await NestFactory.createMicroservice(AppModule, {
  //   transport: Transport.GRPC,
  //   options: {
  //     url: '0.0.0.0:50051',
  //     package: 'category',
  //     protoPath: path.resolve(__dirname, '../../proto/category.proto'),
  //   },
  // });

  // await app.listen();
}
bootstrap();

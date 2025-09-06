import { Module } from '@nestjs/common';
import { NutritionistsService } from './nutritionists.service';
import { NutritionistsController } from './nutritionists.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { NutritionistProfile,NutritionistProfileSchema } from 'src/schema/nutritionist-profile.schema';

@Module({
   imports: [
    MongooseModule.forFeature([{ name: NutritionistProfile.name, schema: NutritionistProfileSchema }]),
  ],
  controllers: [NutritionistsController],
  providers: [NutritionistsService],
})
export class NutritionistsModule {}

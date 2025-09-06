import { Injectable } from '@nestjs/common';
import { NutritionistProfile,NutritionistProfileDocument } from 'src/schema/nutritionist-profile.schema';
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'


@Injectable()
export class NutritionistsService {



    constructor(
    @InjectModel(NutritionistProfile.name) private nutritionistModel: Model<NutritionistProfileDocument>,
  ) {}

  async findAll() {
    return this.nutritionistModel.find().exec()
  }

}

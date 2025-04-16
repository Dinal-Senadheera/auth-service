/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schema/user.schema';

export type user = any;

@Injectable()
export class UserService {
  constructor(@Inject('USER_MODEL') private userModel: Model<User>) {}

  async create(userData: any): Promise<User> {
    const newUser = {
      fullName: `${userData.given_name} ${userData.family_name}`,
      email: userData.email,
    };

    const createdUser = await this.userModel.create(newUser);
    return createdUser;
  }

  async newUserUpdate(email, userDto): Promise<any> {
    try {
      const userExists = await this.findOne(email);
      if (!userExists) {
        return { sucess: false, error: 'User does not exist' };
      }
      userExists.phone = userDto.phone;
      userExists.role = userDto.role.toUpperCase();

      const updatedUser = await userExists.save();

      return { sucess: true, user: updatedUser };
    } catch (error) {
      return { sucess: false, error: 'Failed to update user' };
    }
  }

  async findAll(): Promise<User[]> {
    const users = await this.userModel.find();
    return users;
  }

  async findOne(email: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    return user;
  }

  async update(email: string, updateUserDto: UpdateUserDto) {
    try {
      const userExists = await this.findOne(email);
      if (!userExists) {
        return { sucess: false, error: 'User does not exist' };
      }
      userExists.fullName = updateUserDto.fullName;
      userExists.phone = updateUserDto.phone;

      const updatedUser = await userExists.save();

      return { sucess: true, user: updatedUser };
    } catch (error) {
      return { sucess: false, error: 'Failed to update user' };
    }
  }

  async remove(id: string) {
    const deletedUser = await this.userModel.findByIdAndDelete(id);
    return deletedUser;
  }
}
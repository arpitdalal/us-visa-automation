import {
  model,
  Schema,
} from 'mongoose';

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  jobId: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    default: null,
  },
});

const User = model("User", UserSchema);

export interface IUser {
  username: string;
  password: string;
  email: string;
  jobId: string;
  date: string;
}

export default User;

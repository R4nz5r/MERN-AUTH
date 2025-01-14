import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodeMailer.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  try {
    const exixtingUser = await userModel.findOne({ email });

    if (exixtingUser) {
      return res.json({ success: false, message: "User already registered" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = new userModel({ name, email, password: hashPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    //sending welcome email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to MyApp",
      text: "Hello, this is a test email from MyApp. Welcome to our platform!",
    };
    await transporter.sendMail(mailOptions);

    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "Incorrect email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.json({ success: true, message: "logout" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};




export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);
    if (user.isAccountVerified) {
      return res.json({ success: true, message: "Account verified" });
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verify your account",
      text: `Your verification code is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "Verification Code sent on your email address",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {

  const { userId, otp } = req.body;
  
  if (!userId || !otp) {
    return res.json({ success: false, message: "Missing details" });
  }

  try {
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    if (user.verifyOtp ==='' || user.verifyOtp !== otp){
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if(user.verifyOtpExpireAt < Date.now()){
      return res.json({ success: false, message: "Verification code expired" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = 0;

    await user.save();
    res.json({ success: true, message: "Account verified successfully" });


  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// 
export const isAuthenticated = async (req, res) => {
  try {
    return res.json({ success: true});
  } catch (error) {
    return res.json({ success: false, message:error.message });
  }
}

// send password reset otp
export const sendResetOtp = async(req, res) => {
  const {email} = req.body;
  if (!email) {
    return res.json({ success: false, message:"Email is required"});
  }
  try {
    const user = await userModel.findOne({ email});
    if (!user) {
      return res.json({ success: false, message: "User not found"});
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password reset OTP",
      text: `Your verification code is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({success: true,message:"OTP sent to your email"});

  } catch (error) {
    return res.json({ success: false, message: error.message});
  }
}

// Reset user password
export const resetPassword = async(req, res) => {

  const {email, otp, newPassword} = req.body;
  if (!email || !otp || !newPassword) {
    return res.json({ success: false, message:"Email,OTP, and New password are required"});
  }
  try {
    
    const user = await userModel.findOne({ email});
    if (!user) {
      return res.json({ success: false, message: "User not found"});
    }
    if (user.resetOtp === "" || user.resetOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP"});
    }
    if (user.resetOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired"});
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;

    await user.save();
    
    return res.json({ success: true, message: "Password reset successfully"});

  } catch (error) {
    return res.json({ success: false, message: error.message});
  }
}

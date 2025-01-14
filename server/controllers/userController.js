import userModel from "../models/userModel.js";

export const getUserData = async (request, res) => {
  try {
    const { userId } = request.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      userData: {
            name: user.name, 
            isAccountVerified: user.isAccountVerified ,
        },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

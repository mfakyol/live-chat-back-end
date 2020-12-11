import ExampleRouter from "./example.router";
import ChatRouter from "./chat.router";
import AuthRouter from "./auth.router";
import MessagesRouter from "./messages.router";
import ProfileImagesRouter from "./profileImages.router";

const AppRoutes = (app) => {
  app.use(ExampleRouter.routerPrefix, ExampleRouter.route());
  app.use(ChatRouter.routerPrefix, ChatRouter.route());
  app.use(AuthRouter.routerPrefix, AuthRouter.route());
  app.use(MessagesRouter.routerPrefix, MessagesRouter.route());
  app.use(ProfileImagesRouter.routerPrefix, ProfileImagesRouter.route());
};

export default AppRoutes;

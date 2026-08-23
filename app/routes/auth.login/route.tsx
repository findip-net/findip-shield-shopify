import { redirect } from "react-router";

export const loader = async () => {
  throw redirect("/");
};

export const action = async () => {
  throw redirect("/");
};

export default function Auth() {
  return null;
}

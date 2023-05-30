import React from "react";
import SignupForm from "./SignupForm";
import { User } from "../domain/io";
import { publish } from "../domain/io";
import { env } from "../domain/env";
import { MessageContext } from "./MessageBar";

export default function Operation(props: {
  user: User | null;
  settings: any;
  output: any;
  width: number;
  height: number;
}) {
  const { user, settings, output, width, height } = props;
  const [formKey, setFormKey] = React.useState(0);

  const messageContext = React.useContext(MessageContext)!;
  const handlePublish = async (userName: string) => {
    try {
      const contentId = await publish(userName, settings, output);
      location.href = `/contents/${userName}/${contentId}`;
      setFormKey(0);
    } catch (e) {
      messageContext.setError(e);
    }
  };
  const handleTryPublish = async (
    event: React.FormEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (user != null) {
      await handlePublish(user.name);
      return;
    }
    setFormKey(Date.now());
  };
  const handleSignupSuccess = async (userName: string) => {
    setFormKey(0);
    await handlePublish(userName);
  };
  const handleSignupFailure = async (error: any) => {
    setFormKey(0);
    messageContext.setError(error);
  };
  const handleSignupCancel = async () => {
    setFormKey(0);
  };
  if (env.prod) {
    return null;
  }
  return (
    <>
      <div className="form" style={{ width, height, boxSizing: "border-box" }}>
        <button className="button wide primary" onClick={handleTryPublish}>
          Publish
        </button>
      </div>
      {formKey > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              background: "black",
              opacity: 0.5,
            }}
            onClick={handleSignupCancel}
          ></div>
          <div style={{ zIndex: 1 }}>
            <SignupForm
              key={formKey}
              onSuccess={handleSignupSuccess}
              onError={handleSignupFailure}
            />
          </div>
        </div>
      )}
    </>
  );
}

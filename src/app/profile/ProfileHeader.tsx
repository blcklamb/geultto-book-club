"use client";

import DetailHeader from "@/components/DetailHeader";

export const ProfileHeader = () => {
  return (
    <DetailHeader
      title="내 프로필"
      onClickBack={() => {
        history.back();
      }}
    />
  );
};

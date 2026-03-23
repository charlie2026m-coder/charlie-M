"use client";

import { useTranslations } from "next-intl";

const NoRoomsAvailable = () => {
  const t = useTranslations();

  return (
    <div className="container px-4 md:px-[100px] py-20 pt-0 text-center">
      <h2 className="text-2xl font-bold text-gray-700 mb-4">
        {t("errors.noRoomsAvailableNearDates")}
      </h2>
      <p className="text-gray-600">
        {t("errors.pleaseSelectDifferentDates")}
      </p>
    </div>
  );
};

export default NoRoomsAvailable;

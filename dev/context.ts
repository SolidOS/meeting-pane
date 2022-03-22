const solidLogic = require("solid-logic")
const meetingPane= require("../src/meetingPane")

export const context = {
  session: {
    store: solidLogic.store,
    paneRegistry: {
      byName: (name) => {
        return meetingPane
      }
    },
    logic: solidLogic.solidLogicSingleton
  },
  dom: document,
  getOutliner: () => null,
};

export const fetcher = solidLogic.store.fetcher;

import { useDispatch, useSelector } from "react-redux";
import {
  chooseBot,
  createBot,
  saveDraft,
  publishBot,
  reloadBots,
  patchDraft,
  patchNested,
  changeRoute,
  deleteRoute,
  uploadDocuments,
  selectSelectedBot,
  selectDirty,
} from "../store/slices/botsSlice.js";

export function useStudio() {
  const dispatch = useDispatch();
  const botsState = useSelector((state) => state.bots);
  const selected = useSelector(selectSelectedBot);
  const dirty = useSelector(selectDirty);
  const confirmDiscard = (message) => !dirty || window.confirm(message);
  return {
    ...botsState,
    bots: botsState.items,
    form: botsState.draft,
    selected,
    dirty,
    busy: botsState.status === "pending",
    choose: (bot) => {
      if (confirmDiscard("Bỏ các thay đổi chưa lưu?"))
        dispatch(chooseBot(bot.id));
    },
    create: (template) => {
      if (confirmDiscard("Bỏ các thay đổi chưa lưu và tạo bot mới?"))
        dispatch(createBot(template));
    },
    reload: () => {
      if (confirmDiscard("Tải lại và bỏ thay đổi chưa lưu?"))
        dispatch(reloadBots());
    },
    save: () => dispatch(saveDraft()),
    publish: () => dispatch(publishBot()),
    patch: (key, value) => dispatch(patchDraft({ key, value })),
    nested: (key, field, value) => dispatch(patchNested({ key, field, value })),
    routeChange: (index, key, value) =>
      dispatch(changeRoute({ index, key, value })),
    deleteRoute: (index) => dispatch(deleteRoute(index)),
    upload: (files) => dispatch(uploadDocuments(files)),
  };
}

# Frontend Redux Toolkit / Thunk

## Cấu trúc

```text
frontend/src/
  main.jsx                    createRoot + Redux Provider
  App.jsx                     Chọn Login / Studio / PublicChat
  pages/
    LoginPage.jsx             Form token, dispatch đăng nhập
    StudioPage.jsx            Bố cục và trạng thái giao diện
    PublicChatPage.jsx        Tải config published qua thunk
  store/
    store.js                  configureStore, reset khi logout
    slices/
      sessionSlice.js         Đăng nhập, token trong RAM
      botsSlice.js            Danh sách, catalog, draft, CRUD/upload
      chatSlice.js            Hội thoại theo bot/revision/preview
      diagnosticsSlice.js     Inspect và index/rebuild theo bot
  services/api.js             HTTP JSON, upload nhị phân, AbortSignal
  hooks/useStudio.js          Nối selector/action với UI, xác nhận bỏ draft
  components/
    common/                   Field, Icon
    chat/Chat.jsx             Hiển thị chat và dispatch gửi tin
    studio/                   Sidebar, toolbar, editor và 8 step
    IndexStatus.jsx           Vòng đời polling, dispatch thunk index
    ConfigurationSteps.jsx    Prompt, feature, inspect
    AdvancedSettings.jsx      Retrieval, rule library, handler
```

## Luồng dữ liệu

Component → dispatch action/createAsyncThunk → services/api → backend
→ pending/fulfilled/rejected → slice reducer → selector → render.

Tất cả gọi mạng đi qua thunk và services/api. State nghiệp vụ (draft, dữ liệu backend,
hội thoại, loading/error/result) nằm trong Redux. State giao diện tạm thời như sidebar,
ô tìm bot, bước đang mở, query nhập kiểm thử và khối rule đang xem dùng useState.
Timer, abort khi unmount và xác nhận bỏ thay đổi thuộc vòng đời giao diện, không đặt trong reducer.

## Hành vi được giữ và củng cố

- Lưu/publish gửi expected_revision; lỗi không xóa draft đang sửa.
- Upload nhiều tệp chỉ thêm vào draft khi toàn bộ đợt parse thành công.
- Đổi ID route cập nhật tham chiếu của tài liệu, link và rule; xóa có kiểm tra tham chiếu.
- Phản hồi bất đồng bộ được đối chiếu requestId; logout reset tất cả slice, kết quả cũ không khôi phục dữ liệu.
- Chat preview/public có key riêng theo bot và revision; unmount hủy request và bỏ session tương ứng.
- Poll index 3 giây; hủy khi unmount; tạm dừng polling trong request rebuild.
- Token không persist localStorage; Redux DevTools tắt để tránh ghi token và tài liệu vào lịch sử debug.
- File và Promise không lưu vào Redux state; File chỉ là tham số của thunk upload.

## Kiểm tra

`npm test`: kiểm thử store/thunk với HTTP giả, cùng render smoke Studio và 8 bước bằng React server renderer.
`npm run build`: kiểm tra Vite production build.
`npm run format`: định dạng source/tests bằng Prettier.

Render smoke không thay thế browser E2E. Đợt refactor này không thay API backend.

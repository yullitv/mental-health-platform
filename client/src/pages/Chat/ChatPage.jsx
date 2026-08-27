const ChatPage = () => {
  return (
    <div className="max-w-4xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-2">Чат</h2>
      <p className="text-muted">
        Тут буде real-time чат зі спеціалістом (Socket.io).
      </p>
    </div>
  );
};

export default ChatPage;

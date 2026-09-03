import { useState } from "react";
import Icon from "./Icon";
import Modal from "./Modal";

/** 문의 정보 — 바뀌면 여기만 고치면 된다 */
const DEVELOPER = "황호태";
const PHONE = "010-5400-5712";
const CALL_DAYS = "월 · 수 · 목요일";

export default function ContactModal({ onClose }) {
  const [copied, setCopied] = useState(false);

  // 클립보드는 보안 컨텍스트(https/localhost)에서만 되므로 실패해도 조용히 넘긴다
  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(PHONE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사 못 하면 번호를 직접 보고 누르면 된다 */
    }
  }

  return (
    <Modal
      icon="phone"
      title="문의 전화"
      subtitle="시스템 관련 문의"
      size="sm"
      onClose={onClose}
      footer={
        <div className="modal-footer-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      }
    >
      <div className="modal-section contact-body">
        <div className="contact-row">
          <span className="contact-label">개발자</span>
          <span className="contact-value">{DEVELOPER}</span>
        </div>
        <div className="contact-row">
          <span className="contact-label">연락처</span>
          <a className="contact-value contact-phone tnum" href={`tel:${PHONE.replace(/-/g, "")}`}>
            {PHONE}
          </a>
          <button
            className="btn btn-secondary btn-sm contact-copy"
            onClick={copyPhone}
            title="번호 복사"
          >
            <Icon name={copied ? "check" : "copy"} size={13} />
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        <p className="contact-note">
          <Icon name="clock" size={14} />
          <span>
            <strong>{CALL_DAYS}</strong>에 전화 주세요.
          </span>
        </p>
      </div>
    </Modal>
  );
}

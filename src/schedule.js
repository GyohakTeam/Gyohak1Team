/**
 * 요일별 출근자 시간표
 * workTimes: 최대 2개 근무 시간대 (분리 근무 지원)
 */

// 3월 4주차

export const SCHEDULE_VERSION = "2026-03-23";

export const SCHEDULE = {
  월: [
    { name: "호태", workTimes: ["08:30-12:00"] },
    { name: "정민", workTimes: ["09:00-17:00"] },
    { name: "예원", workTimes: ["08:30-14:30", "17:30-19:30"] },
    { name: "지현", workTimes: ["11:00-13:30", "17:30-20:00"] },
    { name: "용호", workTimes: ["14:00-22:00"] },
    { name: "예빈", workTimes: ["12:00-17:30"] },
    { name: "예인", workTimes: ["12:00-15:30"] },
    { name: "민정", workTimes: ["17:30-22:00"] },
  ],
  화: [
    { name: "지현", workTimes: ["08:30-14:00"] },
    { name: "민정", workTimes: ["08:30-11:30"] },
    { name: "예빈", workTimes: ["08:30-11:30", "17:30-21:00"] },
    { name: "설진", workTimes: ["09:00-11:30"] },
    { name: "소은", workTimes: ["09:00-14:30", "17:30-20:00"] },
    { name: "지상", workTimes: ["12:00-15:30"] },
    { name: "가영", workTimes: ["12:00-17:30"] },
    { name: "예인", workTimes: ["12:00-15:30", "17:30-21:00"] },
    { name: "호태", workTimes: ["17:30-22:00"] },
  ],
  수: [
    { name: "호태", workTimes: ["08:30-14:00"] },
    { name: "가영", workTimes: ["08:30-11:30"] },
    { name: "지현", workTimes: ["08:30-11:30", "13:30-17:00"] },
    { name: "예빈", workTimes: ["09:00-11:30", "13:30-18:00"] },
    { name: "예원", workTimes: ["12:00-14:30", "17:30-21:00"] },
    { name: "용호", workTimes: ["12:00-17:00"] },
    { name: "예인", workTimes: ["13:30-21:00"] },
    { name: "민정", workTimes: ["15:00-22:00"] },
    { name: "정민", workTimes: ["15:00-20:00"] },
    { name: "지상", workTimes: ["14:00-22:00"] },
    { name: "설진", workTimes: ["15:00-20:00"] },
  ],
  목: [
    { name: "지현", workTimes: ["08:30-11:30"] },
    { name: "지상", workTimes: ["08:30-15:30"] },
    { name: "용호", workTimes: ["08:30-15:30"] },
    { name: "가영", workTimes: ["12:00-15:30"] },
    { name: "예원", workTimes: ["13:30-14:30", "15:30-20:00"] },
    { name: "정민", workTimes: ["15:00-17:30", "20:00-22:00"] },
    { name: "소은", workTimes: ["17:30-21:30"] },
    { name: "설진", workTimes: ["17:30-22:00"] },
  ],
  금: [
    { name: "가영", workTimes: ["08:30-16:30"] },
    { name: "민정", workTimes: ["08:30-13:30"] },
    { name: "소은", workTimes: ["09:00-11:30", "15:00-20:30"] },
    { name: "설진", workTimes: ["12:00-20:00"] },
    { name: "용호", workTimes: ["15:00-18:00"] },
    { name: "호태", workTimes: ["17:30-22:00"] },
  ],
};

export const DAYS = ["월", "화", "수", "목", "금"];

/** 점검표 이미지와 동일한 사람별 전용 색상 */
export const PERSON_COLORS = {
  호태: "#FF8C69",
  민정: "#66FFFF",
  예원: "#FFCC00",
  지현: "#FFA867",
  정민: "#6699FF",
  예빈: "#FF99CC",
  가영: "#FFE699",
  지상: "#CCCCFF",
  용호: "#70ed91",
  소은: "#FFC8BD",
  예인: "#33CC33",
  설진: "#D0CECE",
};

export function getPersonColor(name) {
  return PERSON_COLORS[name] ?? "#BBBBBB";
}

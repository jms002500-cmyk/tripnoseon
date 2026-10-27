// 구글 지도 웹 설정(공개용). 지도 웹 키는 원래 페이지에 그대로 보이는 값이라, 보안은 구글 클라우드의 키 제한이 맡음:
//   웹사이트 제한: https://jms002500-cmyk.github.io/* 와 개발용 http://127.0.0.1:5173/*, http://localhost:5173/*
//   API 제한: Maps JavaScript API, Places API (New)만
// Firebase(함께 짜기)와는 다른 구글 클라우드 프로젝트에 둠 (결제를 붙이면 Firebase가 유료 요금제로 바뀌어서)
// mapId: 구글 클라우드 '지도 관리'에서 만든 지도 ID(무료). 비어 있으면 구글 시험용 DEMO_MAP_ID
export const mapsConfig = { apiKey:'AIzaSyD27eSG0RtF0a0SVjgLn7YhWqrE_1kT1Mg', mapId:'' };

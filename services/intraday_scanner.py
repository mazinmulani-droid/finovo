"""Live intraday stock scanner service for real-time stock monitoring."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, date, time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import yfinance as yf
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class IntradayStock:
    """Represents a live intraday stock with key metrics."""
    symbol: str
    name: str
    current_price: float
    change: float
    change_percent: float
    volume: int
    avg_volume: int
    volume_ratio: float
    high: float
    low: float
    open_price: float
    pdh: float  # Previous Day High
    pdl: float  # Previous Day Low
    rsi: Optional[float] = None
    momentum: Optional[float] = None
    volatility: Optional[float] = None
    last_update: datetime = None
    
    def is_breakout_above_pdh(self) -> bool:
        """Check if stock is breaking out above previous day high."""
        return self.current_price > self.pdh * 1.001  # 0.1% above PDH
    
    def is_breakdown_below_pdl(self) -> bool:
        """Check if stock is breaking down below previous day low."""
        return self.current_price < self.pdl * 0.999  # 0.1% below PDL
    
    def is_high_volume(self) -> bool:
        """Check if volume is significantly higher than average."""
        return self.volume_ratio > 1.5
    
    def is_strong_momentum(self) -> bool:
        """Check if stock has strong momentum."""
        return self.momentum is not None and abs(self.momentum) > 0.02


NIFTY_NAMES: Dict[str, str] = {
    'RELIANCE': 'Reliance Industries',
    'TCS': 'Tata Consultancy Services',
    'HDFCBANK': 'HDFC Bank',
    'ICICIBANK': 'ICICI Bank',
    'BHARTIARTL': 'Bharti Airtel',
    'INFY': 'Infosys',
    'KOTAKBANK': 'Kotak Mahindra Bank',
    'HINDUNILVR': 'Hindustan Unilever',
    'ITC': 'ITC Limited',
    'SBIN': 'State Bank of India',
    'LT': 'Larsen & Toubro',
    'M&M': 'Mahindra & Mahindra',
    'SUNPHARMA': 'Sun Pharmaceutical',
    'TITAN': 'Titan Company',
    'MARUTI': 'Maruti Suzuki',
    'NTPC': 'NTPC Limited',
    'POWERGRID': 'Power Grid Corporation',
    'ONGC': 'Oil & Natural Gas Corp',
    'COALINDIA': 'Coal India',
    'BPCL': 'Bharat Petroleum',
    'GAIL': 'GAIL (India)',
    'TATASTEEL': 'Tata Steel',
    'TECHM': 'Tech Mahindra',
    'GRASIM': 'Grasim Industries',
    'SHREECEM': 'Shree Cement',
    'JSWSTEEL': 'JSW Steel',
    'HINDALCO': 'Hindalco Industries',
    'DIVISLAB': "Divi's Laboratories",
    'DRREDDY': "Dr. Reddy's Labs",
    'ADANIPORTS': 'Adani Ports & SEZ',
    'ULTRACEMCO': 'UltraTech Cement',
    'BAJFINANCE': 'Bajaj Finance',
    'HDFCLIFE': 'HDFC Life Insurance',
    'HEROMOTOCO': 'Hero MotoCorp',
    'NESTLEIND': 'Nestle India',
    'CIPLA': 'Cipla',
    'BRITANNIA': 'Britannia Industries',
    'UPL': 'UPL Limited',
    'EICHERMOT': 'Eicher Motors',
    'APOLLOHOSP': 'Apollo Hospitals',
    'TATAMOTORS': 'Tata Motors',
    'WIPRO': 'Wipro',
    'INDUSINDBK': 'IndusInd Bank',
    'SBILIFE': 'SBI Life Insurance'
}


class IntradayScanner:
    """Live intraday stock scanner with high-performance cached batch data fetching."""
    
    def __init__(self):
        self.nifty50_symbols = [
            'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'BHARTIARTL.NS',
            'INFY.NS', 'KOTAKBANK.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS',
            'LT.NS', 'M&M.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'MARUTI.NS',
            'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'COALINDIA.NS', 'BPCL.NS',
            'GAIL.NS', 'TATASTEEL.NS', 'TECHM.NS', 'GRASIM.NS', 'SHREECEM.NS',
            'JSWSTEEL.NS', 'HINDALCO.NS', 'DIVISLAB.NS', 'DRREDDY.NS', 'ADANIPORTS.NS',
            'ULTRACEMCO.NS', 'BAJFINANCE.NS', 'HDFCLIFE.NS', 'HEROMOTOCO.NS', 'NESTLEIND.NS',
            'CIPLA.NS', 'BRITANNIA.NS', 'UPL.NS', 'EICHERMOT.NS', 'APOLLOHOSP.NS',
            'TATAMOTORS.NS', 'WIPRO.NS', 'HDFC.NS', 'INDUSINDBK.NS', 'SBILIFE.NS'
        ]
        
        self.cache: Dict[str, IntradayStock] = {}
        self.last_update: Optional[datetime] = None
        self._cache_ttl_seconds = 60
        
    async def get_live_stocks(self, symbols: List[str] = None, force_refresh: bool = False) -> List[IntradayStock]:
        """
        Get live stock data with fast batch downloading and 60-second caching.
        """
        if symbols is None:
            symbols = self.nifty50_symbols
            
        now = datetime.now()
        # Fast cache return if within TTL
        if not force_refresh and self.cache and self.last_update:
            age = (now - self.last_update).total_seconds()
            if age < self._cache_ttl_seconds:
                return sorted(list(self.cache.values()), key=lambda x: (x.volume_ratio, abs(x.change_percent)), reverse=True)

        try:
            # Run batch download in thread pool to not block asyncio event loop
            loop = asyncio.get_running_loop()
            stocks = await loop.run_in_executor(None, self._sync_batch_download, symbols)
            
            if stocks:
                self.cache = {s.symbol: s for s in stocks}
                self.last_update = now
                return sorted(stocks, key=lambda x: (x.volume_ratio, abs(x.change_percent)), reverse=True)
            elif self.cache:
                return sorted(list(self.cache.values()), key=lambda x: (x.volume_ratio, abs(x.change_percent)), reverse=True)
            return []
        except Exception as e:
            logger.error(f"Error fetching live stocks: {e}")
            return list(self.cache.values()) if self.cache else []
    
    def _sync_batch_download(self, symbols: List[str]) -> List[IntradayStock]:
        """Synchronously batch download all symbols in 1-2 rapid requests instead of 100+ requests."""
        stocks: List[IntradayStock] = []
        try:
            # Batch download daily for PDH, PDL, and prev volume
            df_daily = yf.download(symbols, period="5d", interval="1d", progress=False, group_by="ticker", threads=True)
            # Batch download 15m intervals for live pricing and technicals
            df_intra = yf.download(symbols, period="3d", interval="15m", progress=False, group_by="ticker", threads=True)

            for sym in symbols:
                try:
                    clean_sym = sym.replace('.NS', '').upper()
                    name = NIFTY_NAMES.get(clean_sym, clean_sym)

                    # Extract sub-dataframes
                    d_daily = df_daily[sym].dropna(how="all") if (isinstance(df_daily.columns, pd.MultiIndex) and sym in df_daily.columns.levels[0]) else pd.DataFrame()
                    d_intra = df_intra[sym].dropna(how="all") if (isinstance(df_intra.columns, pd.MultiIndex) and sym in df_intra.columns.levels[0]) else pd.DataFrame()

                    if d_daily.empty and d_intra.empty:
                        continue

                    # PDH / PDL from previous completed session
                    pdh = 0.0
                    pdl = 0.0
                    avg_volume = 1
                    if len(d_daily) >= 2:
                        prev_row = d_daily.iloc[-2]
                        pdh = float(prev_row.get('High', 0.0))
                        pdl = float(prev_row.get('Low', 0.0))
                        avg_volume = int(prev_row.get('Volume', 1))

                    # Current intraday price & technicals
                    if not d_intra.empty:
                        latest = d_intra.iloc[-1]
                        current_price = float(latest.get('Close', 0.0))
                        volume = int(latest.get('Volume', 0))
                        high = float(latest.get('High', current_price))
                        low = float(latest.get('Low', current_price))
                    elif not d_daily.empty:
                        latest = d_daily.iloc[-1]
                        current_price = float(latest.get('Close', 0.0))
                        volume = int(latest.get('Volume', 0))
                        high = float(latest.get('High', current_price))
                        low = float(latest.get('Low', current_price))
                    else:
                        continue

                    open_price = float(d_daily.iloc[-1].get('Open', current_price)) if not d_daily.empty else current_price
                    change = current_price - open_price
                    change_percent = (change / open_price * 100) if open_price > 0 else 0.0

                    # Technical indicators from intraday data
                    rsi = self._calculate_rsi(d_intra) if not d_intra.empty else None
                    momentum = self._calculate_momentum(d_intra) if not d_intra.empty else None
                    volatility = self._calculate_volatility(d_intra) if not d_intra.empty else None

                    stock = IntradayStock(
                        symbol=clean_sym,
                        name=name,
                        current_price=round(current_price, 2),
                        change=round(change, 2),
                        change_percent=round(change_percent, 2),
                        volume=volume,
                        avg_volume=avg_volume,
                        volume_ratio=round(self._calculate_volume_ratio(volume, avg_volume), 2),
                        high=round(high, 2),
                        low=round(low, 2),
                        open_price=round(open_price, 2),
                        pdh=round(pdh, 2),
                        pdl=round(pdl, 2),
                        rsi=round(rsi, 2) if rsi is not None else None,
                        momentum=round(momentum, 4) if momentum is not None else None,
                        volatility=round(volatility, 4) if volatility is not None else None,
                        last_update=datetime.now()
                    )
                    stocks.append(stock)
                except Exception as inner_e:
                    logger.warning(f"Error processing {sym}: {inner_e}")
                    continue
        except Exception as e:
            logger.error(f"Error in _sync_batch_download: {e}")
        return stocks
    
    def _calculate_volume_ratio(self, current_volume: int, avg_volume: int) -> float:
        """Calculate volume ratio (current / average)."""
        if avg_volume == 0:
            return 1.0
        return current_volume / avg_volume
    
    def _calculate_rsi(self, data: pd.DataFrame, period: int = 14) -> Optional[float]:
        """Calculate RSI indicator."""
        try:
            if len(data) < period + 1:
                return None
            
            closes = data['Close']
            delta = closes.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            
            return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None
            
        except Exception:
            return None
    
    def _calculate_momentum(self, data: pd.DataFrame, period: int = 10) -> Optional[float]:
        """Calculate price momentum."""
        try:
            if len(data) < period:
                return None
            
            current_price = data['Close'].iloc[-1]
            past_price = data['Close'].iloc[-period]
            
            return (current_price - past_price) / past_price
            
        except Exception:
            return None
    
    def _calculate_volatility(self, data: pd.DataFrame, period: int = 20) -> Optional[float]:
        """Calculate price volatility."""
        try:
            if len(data) < period:
                return None
            
            returns = data['Close'].pct_change().dropna()
            volatility = returns.rolling(window=min(period, len(returns))).std().iloc[-1]
            
            return float(volatility) if not pd.isna(volatility) else None
            
        except Exception:
            return None
    
    def get_filtered_stocks(
        self, 
        min_volume_ratio: float = 1.5,
        min_change_percent: float = 1.0,
        show_breakouts: bool = True,
        show_high_volume: bool = True
    ) -> List[IntradayStock]:
        """
        Get filtered stocks based on criteria.
        
        Args:
            min_volume_ratio: Minimum volume ratio
            min_change_percent: Minimum change percentage
            show_breakouts: Show PDH/PDL breakouts
            show_high_volume: Show high volume stocks
            
        Returns:
            Filtered list of stocks
        """
        if not self.cache:
            return []
        
        stocks = list(self.cache.values())
        filtered = []
        
        for stock in stocks:
            # Volume filter
            if show_high_volume and not stock.is_high_volume():
                continue
            
            # Change filter
            if abs(stock.change_percent) < min_change_percent:
                continue
            
            # Breakout filter
            if show_breakouts and not (stock.is_breakout_above_pdh() or stock.is_breakdown_below_pdl()):
                continue
            
            filtered.append(stock)
        
        return sorted(filtered, key=lambda x: abs(x.change_percent), reverse=True)
    
    async def start_monitoring(self, symbols: List[str] = None, update_interval: int = 30):
        """
        Start continuous monitoring of stocks.
        
        Args:
            symbols: List of symbols to monitor
            update_interval: Update interval in seconds
        """
        while True:
            try:
                await self.get_live_stocks(symbols)
                await asyncio.sleep(update_interval)
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait longer on error


# Global scanner instance
intraday_scanner = IntradayScanner()
